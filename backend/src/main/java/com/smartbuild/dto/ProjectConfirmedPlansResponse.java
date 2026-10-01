package com.smartbuild.dto;

import java.util.List;

public record ProjectConfirmedPlansResponse(
        Long projectId,
        Integer totalFloors,
        Double totalBuiltUpAreaSqFt,
        List<ConfirmedFloorDto> floors
) {
}
