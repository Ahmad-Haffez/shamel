FROM flink:1.19

# Copy the custom SQL job JAR
COPY ../sql-job/target/flink-sql-job-1.0-SNAPSHOT.jar /opt/flink/usrlib/flink-sql-job.jar

# Download required connectors - all in one layer for efficiency
RUN curl -L -o /opt/flink/lib/flink-connector-kafka.jar \
    https://repo1.maven.org/maven2/org/apache/flink/flink-sql-connector-kafka/1.17.2/flink-sql-connector-kafka-1.17.2.jar && \
    curl -L -o /opt/flink/lib/flink-sql-connector-opensearch.jar \
    https://repo1.maven.org/maven2/org/apache/flink/flink-sql-connector-opensearch/1.2.0-1.19/flink-sql-connector-opensearch-1.2.0-1.19.jar && \
    ls -lh /opt/flink/lib/*.jar | grep -E '(kafka|opensearch)'

USER flink
