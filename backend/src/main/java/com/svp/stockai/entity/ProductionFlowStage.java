package com.svp.stockai.entity;

/**
 * The mandatory physical flow for a PP bag production run. The database keeps
 * stages generic, so this enum validates their configured sequence and unit type.
 */
public enum ProductionFlowStage {
    UNIT_1_EXTRUSION(1, "Extrusion"),
    UNIT_2_WEAVING(2, "Weaving"),
    UNIT_3_CONVERSION(3, "Conversion");

    private final int sequenceNo;
    private final String unitType;

    ProductionFlowStage(int sequenceNo, String unitType) {
        this.sequenceNo = sequenceNo;
        this.unitType = unitType;
    }

    public int sequenceNo() {
        return sequenceNo;
    }

    public boolean matches(ProductionStage stage) {
        return stage.getSequenceNo() != null
                && stage.getSequenceNo() == sequenceNo
                && stage.getUnit() != null
                && unitType.equals(stage.getUnit().getUnitType());
    }
}
