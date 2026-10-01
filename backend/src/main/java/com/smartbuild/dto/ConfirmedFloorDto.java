package com.smartbuild.dto;

import java.time.Instant;
import java.util.List;

public record ConfirmedFloorDto(
        Long planId,
        Integer floorNumber,
        String floorName,
        String planType,
        String status,
        Instant confirmedAt,
        List<RoomDto> rooms,
        List<OpeningDto> openings,
        List<StairDto> stairs
) {
}
