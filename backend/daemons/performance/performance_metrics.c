#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include "performance.h"

static int read_iface_bytes(const char *iface, unsigned long long *rx, unsigned long long *tx) {
  FILE *f = fopen("/proc/net/dev", "r");
  if (!f) return -1;

  char line[256];
  int found = 0;

  while (fgets(line, sizeof(line), f)) {
    char name[64] = {0};
    unsigned long long rx_bytes = 0, tx_bytes = 0;

    if (sscanf(line, " %63[^:]: %llu %*u %*u %*u %*u %*u %*u %*u %llu",
               name, &rx_bytes, &tx_bytes) == 3) {
      if (strcmp(name, iface) == 0) {
        *rx = rx_bytes;
        *tx = tx_bytes;
        found = 1;
        break;
      }
    }
  }

  fclose(f);
  return found ? 0 : -1;
}

int collect_performance_metrics(struct performance_metrics *out) {
  if (!out) return -1;

  const char *target = getwenv("PERF_TARGET");
  if (!target || !*target) target = "8.8.8.8";

  char cmd[256];
  snprintf(cmd, sizeof(cmd), "/bin/ping -c 4 %s 2>/dev/null", target);

  FILE *fp = popen(cmd, "r");
  if (!fp) return -1;

  out->latency = 0.0;
  out->packet_loss = 100.0;
  out->throughput = 0.0;

  char line[256];
  while (fgets(line, sizeof(line), fp)) {
    if (strstr(line, "packet loss")) {
      double loss = 0.0;
      if (sscanf(line, "%*d packets transmitted, %*d received, %lf%% packet loss", &loss) == 1) {
        out->packet_loss = loss;
      } else if (sscanf(line, "%*d packets transmitted, %*d packets received, %lf%% packet loss", &loss) == 1) {
        out->packet_loss = loss;
      }
    }
    if (strstr(line, "round-trip min/avg/max")) {
      double minv = 0.0, avgv = 0.0, maxv = 0.0;
      if (sscanf(line, "round-trip min/avg/max = %lf/%lf/%lf", &minv, &avgv, &maxv) == 3) {
        out->latency = avgv;
      }
    } else if (strstr(line, "rtt min/avg/max/mdev")) {
      double minv = 0.0, avgv = 0.0, maxv = 0.0, mdev = 0.0;
      if (sscanf(line, "rtt min/avg/max/mdev = %lf/%lf/%lf/%lf", &minv, &avgv, &maxv, &mdev) == 4) {
        out->latency = avgv;
      }
    }
  }

  pclose(fp);

  if (out->packet_loss < 0.0 || out->packet_loss > 100.0) {
    out->packet_loss = 100.0;
  }
  if (out->latency < 0.0) {
    out->latency = 0.0;
  }

  const char *iface = getenv("PERF_IFACE");
  if (!iface || !*iface) iface = "eth0";

  unsigned long long rx1 = 0, tx1 = 0, rx2 = 0, tx2 = 0;
  const int sample_seconds = 1;

  if (read_iface_bytes(iface, &rx1, &tx1) == 0) {
    sleep(sample_seconds);
    if (read_iface_bytes(iface, &rx2, &tx2) == 0 && rx2 >= rx1 && tx2 >= tx1) {
      double bits = (double)((rx2 - rx1) + (tx2 - tx1)) * 8.0;
      double mbps = bits / (sample_seconds * 1000.0 * 1000.0);
      out->throughput = mbps;
    } else {
      out->throughput = 0.0;
    }
  } else {
    out->throughput = 0.0;
  }

  return 0;
}
