ARG username

USER $username

RUN curl https://get.volta.sh | bash

COPY volta.bashrc /etc/bashrc

RUN volta install pnpm@10

USER root
