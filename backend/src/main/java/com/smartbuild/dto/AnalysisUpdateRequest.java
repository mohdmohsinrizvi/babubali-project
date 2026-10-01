package com.smartbuild.dto;

import java.util.List;

public record AnalysisUpdateRequest(
        List<RoomDto> rooms,
        List<OpeningDto> openings,
        List<StairDto> stairs
) {
}
