FROM eclipse-temurin:21-jre-alpine
RUN mkdir /app
COPY build/libs/payroll-insight-pro-all.jar /app/app.jar
ENTRYPOINT ["java", "-jar", "/app/app.jar"]