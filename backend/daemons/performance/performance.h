// performance.h
#ifndef PERFORMANCE_H
#define PERFORMANCE_H

struct performance_metrics {
  double latency;
  double packet_loss;
  double throughput;
};

int collect_performance_metrics(struct performance_metrics *out);

#endif
