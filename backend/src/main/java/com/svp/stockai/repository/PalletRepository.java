package com.svp.stockai.repository;

import com.svp.stockai.entity.Pallet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PalletRepository
        extends JpaRepository<Pallet, Long> {

    Optional<Pallet> findByPalletCode(String palletCode);

    Optional<Pallet> findByBarcode(String barcode);

    List<Pallet> findByStatus(String status);

    boolean existsByPalletCode(String palletCode);

    boolean existsByBarcode(String barcode);
}