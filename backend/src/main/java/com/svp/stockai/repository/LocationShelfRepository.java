package com.svp.stockai.repository;

import com.svp.stockai.entity.LocationShelf;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LocationShelfRepository extends JpaRepository<LocationShelf, Long> {
    List<LocationShelf> findByRack_RackId(Long rackId);
    Optional<LocationShelf> findByRack_RackIdAndShelfCode(Long rackId, String shelfCode);
}
