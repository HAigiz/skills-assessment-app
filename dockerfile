FROM python:3.12-alpine3.23

WORKDIR /app

RUN apk update && apk add --no-cache \
    gcc \
    postgresql-client 

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["flask", "run"]