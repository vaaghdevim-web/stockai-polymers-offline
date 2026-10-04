package com.svp.stockai.repository;

import com.svp.stockai.entity.UnitOperation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UnitOperationRepository extends JpaRepository<UnitOperation, Long> {

    List<UnitOperation> findByProductionRun_ProductionId(Long productionId);

    List<UnitOperation> findByMachine_MachineId(Long machineId);
}
