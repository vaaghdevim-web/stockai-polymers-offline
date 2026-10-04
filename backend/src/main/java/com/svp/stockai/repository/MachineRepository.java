package com.svp.stockai.repository;

import com.svp.stockai.entity.Machine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface MachineRepository extends JpaRepository<Machine, Long> {

    List<Machine> findByIsActiveTrueAndStatusIn(Collection<String> statuses);
}
