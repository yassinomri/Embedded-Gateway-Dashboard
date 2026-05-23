CC ?= cc
CROSS_COMPILE ?=
CFLAGS ?= -O2 -Wall -Wextra -std=c11
CPPFLAGS ?=
LDFLAGS ?=
LDLIBS ?=
STATIC ?= 0

PREFIX ?= /usr
DESTDIR ?=

BUILD_DIR := build
BIN_DIR := $(BUILD_DIR)/bin

PERF_DIR := daemons/performance
PERF_OBJS := $(BUILD_DIR)/performance.o $(BUILD_DIR)/performance_metrics.o
PERF_BIN := $(BIN_DIR)/performance

PA_DIR := daemons/packet-analyzer
PA_OBJS := $(BUILD_DIR)/packet_analyzerd.o
PA_BIN := $(BIN_DIR)/packet_analyzerd

.PHONY: all clean install

ifneq ($(strip $(CROSS_COMPILE)),)
CC := $(CROSS_COMPILE)gcc
endif

ifeq ($(STATIC),1)
LDFLAGS += -static
endif

all: $(PERF_BIN) $(PA_BIN)

$(BUILD_DIR):
	mkdir -p $(BUILD_DIR)

$(BIN_DIR): | $(BUILD_DIR)
	mkdir -p $(BIN_DIR)

$(BUILD_DIR)/performance.o: $(PERF_DIR)/performance.c $(PERF_DIR)/performance.h | $(BUILD_DIR)
	$(CC) $(CPPFLAGS) $(CFLAGS) -c -o $@ $(PERF_DIR)/performance.c

$(BUILD_DIR)/performance_metrics.o: $(PERF_DIR)/performance_metrics.c $(PERF_DIR)/performance.h | $(BUILD_DIR)
	$(CC) $(CPPFLAGS) $(CFLAGS) -c -o $@ $(PERF_DIR)/performance_metrics.c

$(PERF_BIN): $(PERF_OBJS) | $(BIN_DIR)
	$(CC) $(CFLAGS) -o $@ $(PERF_OBJS) $(LDFLAGS) $(LDLIBS)

$(BUILD_DIR)/packet_analyzerd.o: $(PA_DIR)/packet_analyzerd.c | $(BUILD_DIR)
	$(CC) $(CPPFLAGS) $(CFLAGS) -c -o $@ $(PA_DIR)/packet_analyzerd.c

$(PA_BIN): $(PA_OBJS) | $(BIN_DIR)
	$(CC) $(CFLAGS) -o $@ $(PA_OBJS) $(LDFLAGS) $(LDLIBS)

install: all
	install -d $(DESTDIR)$(PREFIX)/sbin
	install -m 0755 $(PERF_BIN) $(DESTDIR)$(PREFIX)/sbin/gateway-perfd
	install -m 0755 $(PA_BIN) $(DESTDIR)$(PREFIX)/sbin/packet-analyzerd
	install -d $(DESTDIR)/etc/init.d
	install -m 0755 init.d/performance $(DESTDIR)/etc/init.d/performance
	install -m 0755 init.d/packet-analyzerd $(DESTDIR)/etc/init.d/packet-analyzerd

clean:
	rm -rf $(BUILD_DIR)
