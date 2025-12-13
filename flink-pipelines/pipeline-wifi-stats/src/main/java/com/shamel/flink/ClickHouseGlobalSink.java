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

public class ClickHouseGlobalSink extends RichSinkFunction<GlobalProtocolStats> {
    private static final Logger LOG = LoggerFactory.getLogger(ClickHouseGlobalSink.class);
    
    private final String jdbcUrl;
    private transient Connection connection;
    private transient PreparedStatement insertStatement;
    
    public ClickHouseGlobalSink(String clickHouseHost, int clickHousePort) {
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
            String createTableSQL = "CREATE TABLE IF NOT EXISTS global_stats (" +
                "timestamp DateTime DEFAULT now(), " +
                "second_party String, " +
                "packets UInt64, " +
                "bytes UInt64, " +
                "last_seen DateTime " +
                ") ENGINE = MergeTree() " +
                "ORDER BY (timestamp, second_party)";
            
            connection.createStatement().execute(createTableSQL);
            
            // Prepare insert statement
            String insertSQL = "INSERT INTO global_stats " +
                "(second_party, packets, bytes, last_seen) " +
                "VALUES (?, ?, ?, toDateTime(?))";
            
            insertStatement = connection.prepareStatement(insertSQL);
            
            LOG.info("ClickHouse global sink initialized: {}", jdbcUrl);
        } catch (Exception e) {
            LOG.error("Failed to initialize ClickHouse connection", e);
            throw e;
        }
    }
    
    @Override
    public void invoke(GlobalProtocolStats stats, Context context) throws Exception {
        try {
            insertStatement.setString(1, stats.getSecondParty());
            insertStatement.setLong(2, stats.getPacketCount());
            insertStatement.setLong(3, stats.getTotalBytes());
            insertStatement.setLong(4, Long.parseLong(stats.getLastSeen()) / 1000); // Convert ms to seconds
            
            insertStatement.executeUpdate();
        } catch (SQLException e) {
            LOG.error("Failed to insert global stats: {}", stats, e);
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
