package com.shamel.flink;

import org.apache.flink.configuration.Configuration;
import org.apache.flink.streaming.api.functions.sink.RichSinkFunction;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.Properties;

public class ClickHouseAnomalySink extends RichSinkFunction<TrafficAnomaly> {
    private static final Logger LOG = LoggerFactory.getLogger(ClickHouseAnomalySink.class);
    
    private final String jdbcUrl;
    private transient Connection connection;
    private transient PreparedStatement insertStatement;
    
    public ClickHouseAnomalySink(String clickHouseHost, int clickHousePort) {
        this.jdbcUrl = String.format("jdbc:clickhouse://%s:%d/default", clickHouseHost, clickHousePort);
    }
    
    @Override
    public void open(Configuration parameters) throws Exception {
        super.open(parameters);
        
        try {
            Class.forName("com.clickhouse.jdbc.ClickHouseDriver");
            
            // Connect with flink user (no password)
            Properties props = new Properties();
            props.setProperty("user", "flink");
            props.setProperty("password", "");
            connection = DriverManager.getConnection(jdbcUrl, props);
            
            // Create table if not exists
            String createTableSQL = "CREATE TABLE IF NOT EXISTS traffic_anomalies (" +
                "timestamp DateTime DEFAULT now(), " +
                "detection_time DateTime, " +
                "subscriber String, " +
                "second_party String, " +
                "anomaly_type String, " +
                "severity String, " +
                "anomaly_score Float64, " +
                "current_value UInt64, " +
                "baseline_value Float64, " +
                "description String " +
                ") ENGINE = MergeTree() " +
                "ORDER BY (timestamp, subscriber, anomaly_type)";
            
            connection.createStatement().execute(createTableSQL);
            
            // Prepare insert statement
            String insertSQL = "INSERT INTO traffic_anomalies " +
                "(detection_time, subscriber, second_party, anomaly_type, severity, " +
                "anomaly_score, current_value, baseline_value, description) " +
                "VALUES (toDateTime(?), ?, ?, ?, ?, ?, ?, ?, ?)";
            
            insertStatement = connection.prepareStatement(insertSQL);
            
            LOG.info("ClickHouse anomaly sink initialized: {}", jdbcUrl);
        } catch (Exception e) {
            LOG.error("Failed to initialize ClickHouse connection", e);
            throw e;
        }
    }
    
    @Override
    public void invoke(TrafficAnomaly anomaly, Context context) throws Exception {
        try {
            insertStatement.setLong(1, Long.parseLong(anomaly.getTimestamp()) / 1000);
            insertStatement.setString(2, anomaly.getSubscriber());
            insertStatement.setString(3, anomaly.getSecondParty());
            insertStatement.setString(4, anomaly.getAnomalyType());
            insertStatement.setString(5, anomaly.getSeverity());
            insertStatement.setDouble(6, anomaly.getAnomalyScore());
            insertStatement.setLong(7, anomaly.getCurrentValue());
            insertStatement.setDouble(8, anomaly.getBaselineValue());
            insertStatement.setString(9, anomaly.getDescription());
            
            insertStatement.executeUpdate();
        } catch (SQLException e) {
            LOG.error("Failed to insert anomaly: {}", anomaly, e);
        }
    }
    
    @Override
    public void close() throws Exception {
        if (insertStatement != null) {
            insertStatement.close();
        }
        if (connection != null) {
            connection.close();
        }
        super.close();
    }
}
