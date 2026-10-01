package com.smartbuild.service.analysis;

import com.smartbuild.dto.OpeningDto;
import com.smartbuild.dto.RoomDto;
import com.smartbuild.dto.StairDto;
import com.smartbuild.model.FloorPlan;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class MockPlanAnalysisEngine implements PlanAnalysisEngine {

    @Override
    public AnalysisExtractionResult extract(FloorPlan floorPlan, String userApiKey) {
        int floor = floorPlan.getFloorNumber() != null ? floorPlan.getFloorNumber() : 0;
        List<RoomDto> rooms = new ArrayList<>();
        List<OpeningDto> openings = new ArrayList<>();
        List<StairDto> stairs = new ArrayList<>();

        if (floor <= 0) {
            // Ground Floor layout
            rooms.add(new RoomDto("rm-1", "Living Room", "LIVING", 16.0, 14.0, 10.0, 224.0));
            rooms.add(new RoomDto("rm-2", "Master Bedroom", "BEDROOM", 14.0, 12.0, 10.0, 168.0));
            rooms.add(new RoomDto("rm-3", "Bedroom 2", "BEDROOM", 12.0, 11.0, 10.0, 132.0));
            rooms.add(new RoomDto("rm-4", "Kitchen", "KITCHEN", 10.0, 9.0, 10.0, 90.0));
            rooms.add(new RoomDto("rm-5", "Master Bathroom", "BATHROOM", 8.0, 5.0, 10.0, 40.0));
            rooms.add(new RoomDto("rm-6", "Common Bathroom", "BATHROOM", 7.0, 5.0, 10.0, 35.0));
            rooms.add(new RoomDto("rm-7", "Utility Area", "UTILITY", 8.0, 4.0, 10.0, 32.0));

            openings.add(new OpeningDto("op-1", "MAIN_DOOR", 1, 4.0, 7.0));
            openings.add(new OpeningDto("op-2", "INTERNAL_DOOR", 4, 3.0, 7.0));
            openings.add(new OpeningDto("op-3", "BATHROOM_DOOR", 2, 2.5, 7.0));
            openings.add(new OpeningDto("op-4", "SLIDING_WINDOW", 3, 5.0, 4.0));
            openings.add(new OpeningDto("op-5", "CASEMENT_WINDOW", 3, 4.0, 4.0));
            openings.add(new OpeningDto("op-6", "VENTILATOR", 2, 2.0, 2.0));

            stairs.add(new StairDto("st-1", 1, 3.5, 2));
        } else {
            // Upper Floor layout
            rooms.add(new RoomDto("rm-" + floor + "-1", "Family Lounge", "LIVING", 14.0, 12.0, 10.0, 168.0));
            rooms.add(new RoomDto("rm-" + floor + "-2", "Master Bedroom " + floor, "BEDROOM", 15.0, 13.0, 10.0, 195.0));
            rooms.add(new RoomDto("rm-" + floor + "-3", "Bedroom " + (floor + 2), "BEDROOM", 13.0, 12.0, 10.0, 156.0));
            rooms.add(new RoomDto("rm-" + floor + "-4", "Study Room", "STUDY", 10.0, 9.0, 10.0, 90.0));
            rooms.add(new RoomDto("rm-" + floor + "-5", "Attached Bathroom", "BATHROOM", 8.0, 5.5, 10.0, 44.0));
            rooms.add(new RoomDto("rm-" + floor + "-6", "Balcony", "BALCONY", 12.0, 5.0, 10.0, 60.0));

            openings.add(new OpeningDto("op-" + floor + "-1", "INTERNAL_DOOR", 4, 3.0, 7.0));
            openings.add(new OpeningDto("op-" + floor + "-2", "BATHROOM_DOOR", 1, 2.5, 7.0));
            openings.add(new OpeningDto("op-" + floor + "-3", "SLIDING_WINDOW", 4, 5.0, 4.0));
            openings.add(new OpeningDto("op-" + floor + "-4", "VENTILATOR", 1, 2.0, 2.0));

            stairs.add(new StairDto("st-" + floor + "-1", 1, 3.5, 2));
        }

        double totalArea = rooms.stream().mapToDouble(RoomDto::areaSqFt).sum();
        double confidence = 0.94 - (floor * 0.02);

        return new AnalysisExtractionResult(rooms, openings, stairs, totalArea, confidence);
    }
}
