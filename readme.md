# Modelia AI Studio

[![CI](https://github.com/surajsharma/modelia/actions/workflows/ci.yml/badge.svg)](https://github.com/surajsharma/modelia/actions/workflows/ci.yml)

## docker

- start the app:
    ```
    pnpm docker:up
    ```
- the app will be available on [localhost:5173/](127.0.0.1:5173/)
- to stop:
    ```
    pnpm docker:down
    ```

## backend

### testing

- run `npx jest` to run unit tests


## frontend

### testing

- run `pnpm test` to run unit tests


## e2e tests with playwright

- in the root directory, this single command - builds, runs tests, exits
  
```
pnpm docker:test
```


## other deliverables

- [AI_USAGE](./AI_USAGE.md)
- [EVAL](./EVAL.md)
- [OPENAPI.YAML](./backend/OPENAPI.yaml), API docs are at [localhost:4000/api-docs/](localhost:4000/api-docs/) while the app is up
