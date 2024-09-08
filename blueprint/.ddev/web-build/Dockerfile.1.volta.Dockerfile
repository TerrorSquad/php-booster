ARG username

USER $username

RUN curl https://get.volta.sh | bash

COPY volta.bashrc /etc/bashrc

RUN for i in $(seq 1 3); do \
      volta install node@20 && volta install pnpm@9 && break; \
    done

USER root
