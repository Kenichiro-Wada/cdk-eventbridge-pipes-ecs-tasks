FROM --platform=linux/x86_64 python:3-alpine

RUN apk update
RUN apk add gcc libc-dev make git libffi-dev openssl-dev python3-dev


WORKDIR /usr/src/app

RUN pip install --no-cache-dir boto3

COPY . .