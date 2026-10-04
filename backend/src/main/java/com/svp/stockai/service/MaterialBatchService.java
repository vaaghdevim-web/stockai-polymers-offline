package com.svp.stockai.service;

import com.svp.stockai.entity.MaterialBatch;
import com.svp.stockai.repository.MaterialBatchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MaterialBatchService {

    private final MaterialBatchRepository materialBatchRepository;

    /**
     * Returns available material batches in FIFO order.
     *
     * FIFO is already enforced by the repository query:
     * receivedAt ASC, batchId ASC
     */
    public List<MaterialBatch> getAvailableBatchesFIFO(Long materialId) {
        if (materialId == null) {
            throw new IllegalArgumentException("Material ID cannot be null");
        }

        return materialBatchRepository.findAvailableBatchesFIFO(materialId);
    }
}