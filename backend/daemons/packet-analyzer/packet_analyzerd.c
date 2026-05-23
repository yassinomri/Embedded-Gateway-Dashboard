#define _POSIX_C_SOURCE 200809L

#include <errno.h>
#include <fcntl.h>
#include <ifaddrs.h>
#include <arpa/inet.h>
#include <netinet/in.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <unistd.h>

#define OUTPUT_FILE "/tmp/packet_analyzer.json"
#define LOG_FILE "/tmp/packet_analyzerd.log"
#define OPTS_FILE "/tmp/packet_analyzer_opts"
#define CAPTURE_FILE "/tmp/packet_analyzer_capture.txt"
#define CAPTURE_TIMEOUT 5

static int iface_exists(const char *iface) {
  char path[128];
  FILE *f;

  if (!iface || !*iface) return 0;

  snprintf(path, sizeof(path), "/sys/class/net/%s", iface);
  f = fopen(path, "r");
  if (f) {
    fclose(f);
    return 1;
  }

  return access(path, F_OK) == 0;
}

static void json_escape(char *dst, size_t dstlen, const char *src) {
  size_t j = 0;
  for (size_t i = 0; src[i] && j + 2 < dstlen; i++) {
    char c = src[i];
    if (c == '\\' || c == '"') {
      dst[j++] = '\\';
      dst[j++] = c;
    } else if (c == '\n' || c == '\r') {
      dst[j++] = ' ';
    } else {
      dst[j++] = c;
    }
  }
  dst[j] = '\0';
}

static void copy_bounded(char *dst, size_t dst_len, const char *src) {
  size_t n;

  if (!dst || dst_len == 0) {
    return;
  }

  if (!src) {
    dst[0] = '\0';
    return;
  }

  n = strcspn(src, "\r\n");
  if (n >= dst_len) {
    n = dst_len - 1;
  }

  memcpy(dst, src, n);
  dst[n] = '\0';
}

static void read_opts(char *iface, size_t iface_len, int *count, char *filter, size_t filter_len) {
  FILE *f = fopen(OPTS_FILE, "r");
  if (!f) return;

  char line[256];
  while (fgets(line, sizeof(line), f)) {
    if (strncmp(line, "interface=", 10) == 0) {
      copy_bounded(iface, iface_len, line + 10);
    } else if (strncmp(line, "count=", 6) == 0) {
      int tmp = atoi(line + 6);
      if (tmp > 0 && tmp <= 200) *count = tmp;
    } else if (strncmp(line, "filter=", 7) == 0) {
      copy_bounded(filter, filter_len, line + 7);
    }
  }
  fclose(f);
}

static void parse_endpoint(const char *token, char *ip, size_t ip_len, int *port) {
  char tmp[64];
  char *last_dot;
  char *endptr;
  long maybe_port;

  strncpy(tmp, token, sizeof(tmp) - 1);
  tmp[sizeof(tmp) - 1] = '\0';

  while (*tmp == ' ' || *tmp == '\t') {
    memmove(tmp, tmp + 1, strlen(tmp));
  }

  last_dot = strrchr(tmp, '.');
  if (last_dot) {
    maybe_port = strtol(last_dot + 1, &endptr, 10);
    if (*endptr == '\0' && maybe_port >= 0 && maybe_port <= 65535) {
      *last_dot = '\0';
      *port = (int)maybe_port;
      strncpy(ip, tmp, ip_len - 1);
      ip[ip_len - 1] = '\0';
      return;
    }
  }

  *port = -1;
  strncpy(ip, tmp, ip_len - 1);
  ip[ip_len - 1] = '\0';
}

static int is_local_ipv4(const char *ip) {
  struct ifaddrs *ifaddr = NULL;
  struct ifaddrs *ifa;
  int found = 0;

  if (!ip || !*ip) {
    return 0;
  }

  if (getifaddrs(&ifaddr) != 0) {
    return 0;
  }

  for (ifa = ifaddr; ifa; ifa = ifa->ifa_next) {
    char addr_buf[INET_ADDRSTRLEN];
    struct sockaddr_in *sin;

    if (!ifa->ifa_addr || ifa->ifa_addr->sa_family != AF_INET) {
      continue;
    }

    sin = (struct sockaddr_in *)ifa->ifa_addr;
    if (!inet_ntop(AF_INET, &sin->sin_addr, addr_buf, sizeof(addr_buf))) {
      continue;
    }

    if (strcmp(addr_buf, ip) == 0) {
      found = 1;
      break;
    }
  }

  freeifaddrs(ifaddr);
  return found;
}

static const char *classify_packet_type(const char *proto, int src_port, int dst_port, const char *detail) {
  if (proto && strcmp(proto, "ICMP") == 0) {
    return "Ping";
  }

  if (proto && strcmp(proto, "ARP") == 0) {
    return "ARP";
  }

  if ((src_port == 53 || dst_port == 53) || (detail && strstr(detail, "DNS"))) {
    return "DNS";
  }

  if (src_port == 67 || src_port == 68 || dst_port == 67 || dst_port == 68) {
    return "DHCP";
  }

  if (src_port == 22 || dst_port == 22) {
    return "SSH";
  }

  if (src_port == 80 || dst_port == 80 || (detail && strstr(detail, "HTTP"))) {
    return "Web";
  }

  if (src_port == 443 || dst_port == 443 || src_port == 8443 || dst_port == 8443) {
    return "HTTPS";
  }

  if (src_port == 123 || dst_port == 123) {
    return "NTP";
  }

  if (src_port == 20 || src_port == 21 || dst_port == 20 || dst_port == 21) {
    return "FTP";
  }

  if (src_port == 23 || dst_port == 23) {
    return "Telnet";
  }

  if (src_port == 25 || src_port == 587 || dst_port == 25 || dst_port == 587) {
    return "SMTP";
  }

  if (src_port == 110 || dst_port == 110) {
    return "POP3";
  }

  if (src_port == 143 || dst_port == 143) {
    return "IMAP";
  }

  return (proto && *proto) ? proto : "IP";
}

static int parse_capture(FILE *in, FILE *out) {
  char line[2048];
  int first = 1;
  int pending = 0;
  char time[64] = {0};
  char proto[16] = {0};
  char direction[16] = {0};
  char flags[32] = {0};
  int ttl = -1;
  int length = 0;

  fprintf(out, "[\n");

  while (fgets(line, sizeof(line), in)) {
    if (strstr(line, "listening on") ||
        strstr(line, "packets captured") ||
        strstr(line, "received by filter") ||
        strstr(line, "dropped by kernel")) {
      continue;
    }

    if (line[0] != ' ' && line[0] != '\t') {
      char iface_name[32] = {0};
      char dir_name[16] = {0};

      memset(time, 0, sizeof(time));
      memset(proto, 0, sizeof(proto));
      memset(direction, 0, sizeof(direction));
      memset(flags, 0, sizeof(flags));
      ttl = -1;
      length = 0;

      if (sscanf(line, "%63s %31s %15s", time, iface_name, dir_name) < 3) {
        pending = 0;
        continue;
      }

      if (strstr(line, "ICMP")) strcpy(proto, "ICMP");
      else if (strstr(line, "TCP")) strcpy(proto, "TCP");
      else if (strstr(line, "UDP")) strcpy(proto, "UDP");
      else if (strstr(line, "ARP")) strcpy(proto, "ARP");
      else strcpy(proto, "IP");

      if (strcmp(dir_name, "Out") == 0) strcpy(direction, "outbound");
      else if (strcmp(dir_name, "In") == 0) strcpy(direction, "inbound");
      else strcpy(direction, "unknown");

      char *flagsp = strstr(line, "flags [");
      if (flagsp) {
        sscanf(flagsp, "flags %31s", flags);
      }

      char *ttlp = strstr(line, "ttl ");
      if (ttlp) {
        sscanf(ttlp, "ttl %d", &ttl);
      }

      char *lenp = strstr(line, "length ");
      if (lenp) {
        sscanf(lenp, "length %d", &length);
      }

      pending = 1;
      continue;
    }

    if (!pending) {
      continue;
    }

    char src_token[64] = {0};
    char dst_token[64] = {0};
    char detail[1024] = {0};
    char src[64] = {0};
    char dst[64] = {0};
    char info[1200] = {0};
    const char *packet_type;
    int src_port = -1;
    int dst_port = -1;
    char ttl_buf[16];
    char src_port_buf[16];
    char dst_port_buf[16];

    if (sscanf(line, " %63s > %63[^:]: %1023[^\n]", src_token, dst_token, detail) < 3) {
      pending = 0;
      continue;
    }

    parse_endpoint(src_token, src, sizeof(src), &src_port);
    parse_endpoint(dst_token, dst, sizeof(dst), &dst_port);

    if (strstr(detail, "ICMP")) strcpy(proto, "ICMP");
    else if (strstr(detail, "TCP")) strcpy(proto, "TCP");
    else if (strstr(detail, "UDP")) strcpy(proto, "UDP");

    if (proto[0] && strcmp(proto, "TCP") == 0) {
      char *tcp_flagsp = strstr(detail, "Flags [");
      if (tcp_flagsp) {
        sscanf(tcp_flagsp, "Flags %31s", flags);
      }
    }

    char *lenp = strstr(detail, "length ");
    if (lenp) {
      sscanf(lenp, "length %d", &length);
    }

    if (!direction[0] || strcmp(direction, "unknown") == 0) {
      if (is_local_ipv4(src)) {
        strcpy(direction, "outbound");
      } else if (is_local_ipv4(dst)) {
        strcpy(direction, "inbound");
      }
    }

    json_escape(info, sizeof(info), detail);
    packet_type = classify_packet_type(proto, src_port, dst_port, detail);

    if (ttl >= 0) snprintf(ttl_buf, sizeof(ttl_buf), "%d", ttl);
    else strcpy(ttl_buf, "null");

    if (src_port >= 0) snprintf(src_port_buf, sizeof(src_port_buf), "%d", src_port);
    else strcpy(src_port_buf, "null");

    if (dst_port >= 0) snprintf(dst_port_buf, sizeof(dst_port_buf), "%d", dst_port);
    else strcpy(dst_port_buf, "null");

    if (!first) fprintf(out, ",\n");
    first = 0;

    fprintf(out,
      "{\n"
      "  \"time\": \"%s\",\n"
      "  \"src\": \"%s\",\n"
      "  \"dst\": \"%s\",\n"
      "  \"protocol\": \"%s\",\n"
      "  \"length\": %d,\n"
      "  \"info\": \"%s\",\n"
      "  \"type\": \"%s\",\n"
      "  \"flags\": \"%s\",\n"
      "  \"ttl\": %s,\n"
      "  \"direction\": \"%s\",\n"
      "  \"src_port\": %s,\n"
      "  \"dst_port\": %s\n"
      "}",
      time,
      src[0] ? src : "unknown",
      dst[0] ? dst : "unknown",
      proto[0] ? proto : "IP",
      length,
      info,
      packet_type,
      flags[0] ? flags : "",
      ttl_buf,
      direction[0] ? direction : "unknown",
      src_port_buf,
      dst_port_buf
    );
    pending = 0;
  }

  fprintf(out, "\n]\n");
  return 0;
}

static void run_capture(const char *iface, int count, const char *filter) {
  pid_t pid;
  int capture_fd;
  int log_fd;
  int status;
  int elapsed = 0;
  char count_buf[16];

  unlink(CAPTURE_FILE);
  snprintf(count_buf, sizeof(count_buf), "%d", count);

  pid = fork();
  if (pid < 0) {
    return;
  }

  if (pid == 0) {
    capture_fd = open(CAPTURE_FILE, O_WRONLY | O_CREAT | O_TRUNC, 0644);
    if (capture_fd < 0) _exit(127);

    log_fd = open(LOG_FILE, O_WRONLY | O_CREAT | O_APPEND, 0644);
    if (log_fd < 0) _exit(127);

    dup2(capture_fd, STDOUT_FILENO);
    dup2(log_fd, STDERR_FILENO);

    if (filter && *filter) {
      execl("/usr/bin/tcpdump",
            "tcpdump",
            "-l",
            "-i",
            iface,
            "-c",
            count_buf,
            "-nn",
            "-tt",
            "-v",
            filter,
            (char *)NULL);
    } else {
      execl("/usr/bin/tcpdump",
            "tcpdump",
            "-l",
            "-i",
            iface,
            "-c",
            count_buf,
            "-nn",
            "-tt",
            "-v",
            (char *)NULL);
    }

    perror("execl tcpdump");

    close(capture_fd);
    close(log_fd);

    _exit(127);
  }

  while (elapsed < CAPTURE_TIMEOUT) {
    pid_t rc = waitpid(pid, &status, WNOHANG);
    if (rc == pid) {
      return;
    }
    sleep(1);
    elapsed++;
  }

  kill(pid, SIGTERM);
  sleep(1);
  if (waitpid(pid, &status, WNOHANG) == 0) {
    kill(pid, SIGKILL);
  }
  waitpid(pid, &status, 0);
}

int main(void) {
  const char *iface_env = getenv("PA_IFACE");
  const char *count_env = getenv("PA_COUNT");
  const char *filter_env = getenv("PA_FILTER");

  char iface[64] = {0};
  char filter[128] = {0};

  if (iface_env && *iface_env) {
    strncpy(iface, iface_env, sizeof(iface) - 1);
  } else {
    strncpy(iface, "any", sizeof(iface) - 1);
  }

  if (filter_env && *filter_env) {
    strncpy(filter, filter_env, sizeof(filter) - 1);
  }

  int count = 20;
  if (count_env && *count_env) {
    int tmp = atoi(count_env);
    if (tmp > 0 && tmp <= 200) count = tmp;
  }

  while (1) {
    read_opts(iface, sizeof(iface), &count, filter, sizeof(filter));
    if (!iface_exists(iface)) {
      strncpy(iface, "any", sizeof(iface) - 1);
      iface[sizeof(iface) - 1] = '\0';
    }

    run_capture(iface, count, filter);

    FILE *fp = fopen(CAPTURE_FILE, "r");
    if (!fp) {
      sleep(5);
      continue;
    }

    char tmp_output[256];
    snprintf(tmp_output, sizeof(tmp_output), "%s.tmp", OUTPUT_FILE);

    FILE *out = fopen(tmp_output, "w");
    if (!out) {
      fclose(fp);
      sleep(5);
      continue;
    }

    parse_capture(fp, out);
    fclose(out);
    fclose(fp);

    if (rename(tmp_output, OUTPUT_FILE) != 0) {
      unlink(tmp_output);
    }

    sleep(5);
  }

  return 0;
}
