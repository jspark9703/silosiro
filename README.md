## 🌐 박준수 25 웹설실 Assignment

###  learner lab 환경 실행 방법

1. **EC2 터미널 접속**
2. 프로젝트 디렉토리로 이동:
   ```bash
   cd ~/a1/silosiro
   ```
3. 서버 실행:
   ```bash
   npm start
   ```

---
### REPO CLONE시 실행방법

1. REPO CLONE
2. ```bash
   npm install
   ```
3. ```bash
   npm start
   ```

### DB 접속 에러 발생 시 (PostgreSQL Docker 컨테이너 재실행)
```bash
  docker rm postgres_container
   ```
  ```bash
  docker run -d \
--name postgres_container \
-p 5432:5432 \
-e PGUSER=postgres \
-e PGPASSWORD=3115 \
-e PGDATABASE=postgres \
postgres
  ```
