# Minimal Makefile for hello_world

CC = gcc
CFLAGS = -Wall -Wextra -O2
LDFLAGS = 

TARGET = hello_world

.PHONY: all
all: $(TARGET)

$(TARGET): hello_world.c
	$(CC) $(CFLAGS) -o $(TARGET) hello_world.c

.PHONY: clean
clean:
	rm -f $(TARGET)

.PHONY: test
test: all
	./$(TARGET)