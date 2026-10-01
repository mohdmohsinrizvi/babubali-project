package com.smartbuild.dto;

import com.smartbuild.model.FloorPlan;
import com.smartbuild.model.FloorPlanStatus;
import java.time.Instant;

public record FloorPlanResponse(
        Long id,
        Long projectId,
        Integer floorNumber,
        String floorName,
        String planType,
        String fileName,
        String fileType,
        Long fileSize,
        FloorPlanStatus status,
        Instant createdAt,
        Instant updatedAt
) {
    public static FloorPlanResponse from(FloorPlan plan) {
        return new FloorPlanResponse(
                plan.getId(),
                plan.getProjectId(),
                plan.getFloorNumber(),
                plan.getFloorName(),
                plan.getPlanType(),
                plan.getFileName(),
                plan.getFileType(),
                plan.getFileSize(),
                plan.getStatus(),
                plan.getCreatedAt(),
                plan.getUpdatedAt()
        );
    }
}
