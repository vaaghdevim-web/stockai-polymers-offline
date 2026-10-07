FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY worker.py .

# Run the telemetry worker as a dedicated non-root user.
RUN addgroup --system --gid 10001 appuser \
    && adduser --system --uid 10001 --gid 10001 appuser \
    && chown -R 10001:10001 /app

USER 10001:10001

CMD ["python", "-u", "worker.py"]
