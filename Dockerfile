FROM mosip/inji-certify:latest

# Copy your properties file into the container
COPY certify-postgres-landregistry.properties /home/mosip/config/certify.properties

# Expose the port Inji Certify runs on
EXPOSE 8080

# Command to run the JAR with your properties file
ENTRYPOINT ["java", "-jar", "certify-service.jar", "--spring.config.location=file:/home/mosip/config/certify.properties"]