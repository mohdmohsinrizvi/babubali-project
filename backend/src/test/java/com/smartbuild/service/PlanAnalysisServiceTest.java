package com.smartbuild.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartbuild.dto.AnalysisUpdateRequest;
import com.smartbuild.dto.OpeningDto;
import com.smartbuild.dto.PlanAnalysisResponse;
import com.smartbuild.dto.ProjectConfirmedPlansResponse;
import com.smartbuild.dto.RoomDto;
import com.smartbuild.dto.StairDto;
import com.smartbuild.model.FloorPlan;
import com.smartbuild.model.FloorPlanStatus;
import com.smartbuild.model.PlanAnalysis;
import com.smartbuild.model.PlanAnalysisStatus;
import com.smartbuild.repository.FloorPlanRepository;
import com.smartbuild.repository.PlanAnalysisRepository;
import com.smartbuild.repository.ProjectRepository;
import com.smartbuild.service.analysis.MockPlanAnalysisEngine;
import com.smartbuild.service.analysis.PlanAnalysisEngine;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PlanAnalysisServiceTest {

    @Mock
    private PlanAnalysisRepository planAnalysisRepository;

    @Mock
    private FloorPlanRepository floorPlanRepository;

    @Mock
    private ProjectRepository projectRepository;

    private PlanAnalysisEngine analysisEngine = new MockPlanAnalysisEngine();
    private ObjectMapper objectMapper = new ObjectMapper();

    private PlanAnalysisService planAnalysisService;

    @BeforeEach
    void setUp() {
        planAnalysisService = new PlanAnalysisService(
                planAnalysisRepository,
                floorPlanRepository,
                projectRepository,
                analysisEngine,
                objectMapper
        );
    }

    @Test
    void analyzePlan_success() {
        Long planId = 10L;
        FloorPlan floorPlan = new FloorPlan();
        floorPlan.setId(planId);
        floorPlan.setProjectId(1L);
        floorPlan.setFloorNumber(0);
        floorPlan.setFloorName("Ground Floor");
        floorPlan.setStatus(FloorPlanStatus.UPLOADED);

        when(floorPlanRepository.findById(planId)).thenReturn(Optional.of(floorPlan));
        when(planAnalysisRepository.findByFloorPlanId(planId)).thenReturn(Optional.empty());

        when(planAnalysisRepository.save(any(PlanAnalysis.class))).thenAnswer(invocation -> {
            PlanAnalysis pa = invocation.getArgument(0);
            pa.setId(100L);
            return pa;
        });

        PlanAnalysisResponse response = planAnalysisService.analyzePlan(planId);

        assertThat(response).isNotNull();
        assertThat(response.status()).isEqualTo(PlanAnalysisStatus.ANALYZED);
        assertThat(response.rooms()).isNotEmpty();
        assertThat(response.openings()).isNotEmpty();
        assertThat(response.stairs()).isNotEmpty();
        assertThat(response.confidenceScore()).isGreaterThan(0.9);
        verify(floorPlanRepository).save(floorPlan);
        assertThat(floorPlan.getStatus()).isEqualTo(FloorPlanStatus.ANALYZED);
    }

    @Test
    void confirmAnalysis_locksStatus() {
        Long planId = 10L;
        FloorPlan floorPlan = new FloorPlan();
        floorPlan.setId(planId);
        floorPlan.setStatus(FloorPlanStatus.ANALYZED);

        PlanAnalysis analysis = new PlanAnalysis();
        analysis.setId(100L);
        analysis.setFloorPlanId(planId);
        analysis.setStatus(PlanAnalysisStatus.ANALYZED);

        when(planAnalysisRepository.findByFloorPlanId(planId)).thenReturn(Optional.of(analysis));
        when(floorPlanRepository.findById(planId)).thenReturn(Optional.of(floorPlan));
        when(planAnalysisRepository.save(any(PlanAnalysis.class))).thenAnswer(i -> i.getArgument(0));

        PlanAnalysisResponse response = planAnalysisService.confirmAnalysis(planId);

        assertThat(response.status()).isEqualTo(PlanAnalysisStatus.CONFIRMED);
        assertThat(response.confirmedAt()).isNotNull();
        assertThat(floorPlan.getStatus()).isEqualTo(FloorPlanStatus.CONFIRMED);
    }

    @Test
    void updateAnalysis_recalculatesTotalArea() {
        Long planId = 10L;
        PlanAnalysis analysis = new PlanAnalysis();
        analysis.setId(100L);
        analysis.setFloorPlanId(planId);

        when(planAnalysisRepository.findByFloorPlanId(planId)).thenReturn(Optional.of(analysis));
        when(planAnalysisRepository.save(any(PlanAnalysis.class))).thenAnswer(i -> i.getArgument(0));

        List<RoomDto> customRooms = List.of(
                new RoomDto("r1", "Drawing Room", "LIVING", 20.0, 15.0, 10.0, 300.0),
                new RoomDto("r2", "Kitchen", "KITCHEN", 10.0, 10.0, 10.0, 100.0)
        );

        AnalysisUpdateRequest request = new AnalysisUpdateRequest(customRooms, List.of(), List.of());
        PlanAnalysisResponse response = planAnalysisService.updateAnalysis(planId, request);

        assertThat(response.rooms()).hasSize(2);
        assertThat(response.totalCalculatedAreaSqFt()).isEqualTo(400.0);
    }

    @Test
    void getProjectConfirmedPlans_returnsMasterContractForMember3() throws Exception {
        Long projectId = 1L;
        when(projectRepository.existsById(projectId)).thenReturn(true);

        FloorPlan floorPlan = new FloorPlan();
        floorPlan.setId(10L);
        floorPlan.setProjectId(projectId);
        floorPlan.setFloorNumber(0);
        floorPlan.setFloorName("Ground Floor");
        floorPlan.setPlanType("ARCHITECTURAL");
        floorPlan.setStatus(FloorPlanStatus.CONFIRMED);

        when(floorPlanRepository.findByProjectIdOrderByFloorNumberAsc(projectId)).thenReturn(List.of(floorPlan));

        PlanAnalysis analysis = new PlanAnalysis();
        analysis.setId(100L);
        analysis.setFloorPlanId(10L);
        analysis.setStatus(PlanAnalysisStatus.CONFIRMED);
        analysis.setConfirmedAt(Instant.now());
        analysis.setRoomsJson(objectMapper.writeValueAsString(List.of(
                new RoomDto("rm-1", "Living", "LIVING", 15.0, 10.0, 10.0, 150.0)
        )));
        analysis.setOpeningsJson("[]");
        analysis.setStairsJson("[]");
        analysis.setTotalCalculatedAreaSqFt(BigDecimal.valueOf(150.0));

        when(planAnalysisRepository.findByFloorPlanId(10L)).thenReturn(Optional.of(analysis));

        ProjectConfirmedPlansResponse master = planAnalysisService.getProjectConfirmedPlans(projectId);

        assertThat(master).isNotNull();
        assertThat(master.projectId()).isEqualTo(projectId);
        assertThat(master.totalFloors()).isEqualTo(1);
        assertThat(master.totalBuiltUpAreaSqFt()).isEqualTo(150.0);
        assertThat(master.floors().get(0).rooms().get(0).name()).isEqualTo("Living");
    }
}
