COPY certificates/* /usr/local/share/ca-certificates/
RUN update-ca-certificates
