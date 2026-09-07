#!/bin/bash
# Script to create Kafka topics for DEVFLOW AI

KAFKA_BROKER=${KAFKA_BROKER:-"localhost:9092"}

echo "Creating Kafka topics on broker: $KAFKA_BROKER..."

topics=(
  "devflow.github.webhooks.v1:12"
  "devflow.repo.indexing.v1:12"
  "devflow.repo.indexed.v1:6"
  "devflow.agent.tasks.v1:12"
  "devflow.agent.steps.v1:16"
  "devflow.review.triggers.v1:8"
  "devflow.review.results.v1:8"
  "devflow.test.generation.v1:8"
  "devflow.collab.relay.v1:24"
  "devflow.audit.events.v1:6"
)

for item in "${topics[@]}"; do
  IFS=":" read -r topic partitions <<< "$item"
  echo "Provisioning topic: $topic with $partitions partitions..."
  kafka-topics.sh --create --if-not-exists \
    --bootstrap-server "$KAFKA_BROKER" \
    --topic "$topic" \
    --partitions "$partitions" \
    --replication-factor 1
done

echo "All DEVFLOW AI Kafka topics successfully created!"
