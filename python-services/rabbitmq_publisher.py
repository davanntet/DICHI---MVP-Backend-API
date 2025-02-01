import pika
import json

RABBITMQ_URL = "amqp://admin:davann@localhost:5672/"
QUEUE_NAME = "fastapi_queue"

def publish_message():
    parameters = pika.URLParameters(RABBITMQ_URL)
    connection = pika.BlockingConnection(parameters)
    channel = connection.channel()

    channel.queue_declare(queue=QUEUE_NAME, durable=True)

    # Send a JSON payload instead of a raw string
    message_body = json.dumps({"pattern": "fastapi_queue", "data": "Dear Davann!,Hello from FastAPI!"})

    channel.basic_publish(
        exchange="",
        routing_key=QUEUE_NAME,
        body=message_body,
        properties=pika.BasicProperties(delivery_mode=2),
    )

    print("✅ Sent JSON Message:", message_body)
    connection.close()

if __name__ == "__main__":
    publish_message()
