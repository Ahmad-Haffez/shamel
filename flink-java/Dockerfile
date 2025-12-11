FROM flink:1.18

# Copy the JAR file
COPY target/wifi-aggregator-1.0-SNAPSHOT.jar /opt/flink/usrlib/

# Copy subscribers JSON as resource (embedded in JAR, but also available as file)
COPY src/main/resources/subscribers.json /opt/flink/usrlib/

# Set working directory
WORKDIR /opt/flink
