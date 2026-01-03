FROM mosipid/inji-certify-service-with-plugins:0.13.1

# Docker creates this inside the container automatically
COPY inji-certify/config/certify.properties /home/mosip/config/certify.properties

# Ensure the templates folder is created and populated
RUN mkdir -p /home/mosip/config/templates
COPY inji-certify/config/templates/ /home/mosip/config/templates/

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "certify-service-with-plugins.jar", "--spring.config.location=file:/home/mosip/config/certify.properties"]