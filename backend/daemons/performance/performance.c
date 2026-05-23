#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <time.h>

#include "performance.h"

#define DEFAULT_TARGET "8.8.8.8"
#define TARGET_FILE "/tmp/perf_target_ip"
#define OUTPUT_FILE "/tmp/performance.json"
#define INTERVAL_SECONDS 30

static void read_target_ip(char *buf, size_t buflen) {
  FILE *f = fopen(TARGET_FILE, "r");
  if (!f) {
    strncpy(buf, DEFAULT_TARGET, buflen - 1);
    buf[buflen - 1] = '\0';
    return;
  }

  if (!fgets(buf, (int)buflen, f)) {
    strncpy(buf, DEFAULT_TARGET, buflen - 1);
    buf[buflen - 1] = '\0';
    fclose(f);
    return;
  }

  // Strip newline
  size_t len = strlen(buf);
  if (len > 0 && (buf[len - 1] == '\n' || buf[len - 1] == '\r')) {
    buf[len - 1] = '\0';
  }
  fclose(f);
}

static void write_json(const struct performance_metrics *metrics) {
  FILE *f = fopen(OUTPUT_FILE, "w");
  if (!f) return;

  // Minimal JSON structure to satisfy frontend contract
  fprintf(f,
    "{\n"
    "  \"metrics\": {\"latency\": %.3f, \"packetLoss\": %.3f, \"throughput\": %.3f},\n"
    "  \"history\": [],\n"
    "  \"qos\": {\"enabled\": false},\n"
    "  \"maxValues\": {\"latency\": %.3f, \"packetLoss\": %.3f, \"throughput\": %.3f},\n"
    "  \"averageValues\": {\"latency\": %.3f, \"packetLoss\": %.3f, \"throughput\": %.3f}\n"
    "}\n",
    metrics->latency, metrics->packet_loss, metrics->throughput,
    metrics->latency, metrics->packet_loss, metrics->throughput,
    metrics->latency, metrics->packet_loss, metrics->throughput
  );

  fclose(f);
}

int main(void) {
  while (1) {
    struct performance_metrics metrics;
    char target[64];

    read_target_ip(target, sizeof(target));

    setenv("PERF_TARGET", target, 1);

    if (collect_performance_metrics(&metrics) == 0) {
      write_json(&metrics);
    }

    sleep(INTERVAL_SECONDS);
  }

  return 0;
}
