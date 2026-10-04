package com.svp.stockai.repository;

import com.svp.stockai.entity.MachineTelemetryLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface MachineTelemetryLogRepository extends JpaRepository<MachineTelemetryLog, Long> {

    List<MachineTelemetryLog> findByMachineCodeOrderByPacketTimestampDesc(String machineCode, Pageable pageable);

    List<MachineTelemetryLog> findByPacketTimestampBetweenOrderByPacketTimestampDesc(Instant start, Instant end);
}
