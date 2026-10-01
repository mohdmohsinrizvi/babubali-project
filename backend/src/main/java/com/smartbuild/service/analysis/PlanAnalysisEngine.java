package com.smartbuild.service.analysis;

import com.smartbuild.dto.OpeningDto;
import com.smartbuild.dto.RoomDto;
import com.smartbuild.dto.StairDto;
import com.smartbuild.model.FloorPlan;
import java.util.List;

public interface PlanAnalysisEngine {

    default AnalysisExtractionResult extract(FloorPlan floorPlan) {
        return extract(floorPlan, null);
    }

    AnalysisExtractionResult extract(FloorPlan floorPlan, String userApiKey);

    record AnalysisExtractionResult(
            List<RoomDto> rooms,
            List<OpeningDto> openings,
            List<StairDto> stairs,
            Double totalAreaSqFt,
            Double confidenceScore
    ) {
    }
}
