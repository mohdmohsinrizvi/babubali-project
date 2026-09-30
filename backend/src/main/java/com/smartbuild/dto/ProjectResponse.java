package com.smartbuild.dto;

import com.smartbuild.model.Project;
import com.smartbuild.model.ProjectStatus;
import java.math.BigDecimal;
import java.time.Instant;

public record ProjectResponse(
        Long id,
        String name,
        String state,
        String district,
        String city,
        String constructionType,
        BigDecimal landAreaSqFt,
        BigDecimal builtUpAreaSqFt,
        Integer floorCount,
        BigDecimal budget,
        ProjectStatus status,
        Instant createdAt,
        Instant updatedAt
) {

    public static ProjectResponse from(Project entity) {
        return new ProjectResponse(
                entity.getId(),
                entity.getName(),
                entity.getState(),
                entity.getDistrict(),
                entity.getCity(),
                entity.getConstructionType(),
                entity.getLandAreaSqFt(),
                entity.getBuiltUpAreaSqFt(),
                entity.getFloorCount(),
                entity.getBudget(),
                entity.getStatus(),
                entity.getCreatedAt(),
                entity.getUpdatedAt());
    }
}
