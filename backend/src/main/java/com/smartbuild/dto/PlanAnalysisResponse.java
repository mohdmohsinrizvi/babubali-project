package com.smartbuild.dto;

import com.smartbuild.model.PlanAnalysisStatus;
import java.time.Instant;
import java.util.List;

public record PlanAnalysisResponse(
        Long id,
        Long floorPlanId,
        Long projectId,
        PlanAnalysisStatus status,
        List<RoomDto> rooms,
        List<OpeningDto> openings,
        List<StairDto> stairs,
        Double totalCalculatedAreaSqFt,
        Double confidenceScore,
        Instant confirmedAt,
        Instant createdAt,
        Instant updatedAt
) {
}
