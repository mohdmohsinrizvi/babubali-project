package com.smartbuild.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartbuild.dto.AnalysisUpdateRequest;
import com.smartbuild.dto.ConfirmedFloorDto;
import com.smartbuild.dto.OpeningDto;
import com.smartbuild.dto.PlanAnalysisResponse;
import com.smartbuild.dto.ProjectConfirmedPlansResponse;
import com.smartbuild.dto.RoomDto;
import com.smartbuild.dto.StairDto;
import com.smartbuild.exception.ResourceNotFoundException;
import com.smartbuild.model.FloorPlan;
import com.smartbuild.model.FloorPlanStatus;
import com.smartbuild.model.PlanAnalysis;
import com.smartbuild.model.PlanAnalysisStatus;
import com.smartbuild.repository.FloorPlanRepository;
import com.smartbuild.repository.PlanAnalysisRepository;
import com.smartbuild.repository.ProjectRepository;
import com.smartbuild.service.analysis.PlanAnalysisEngine;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PlanAnalysisService {

    private final PlanAnalysisRepository planAnalysisRepository;
    private final FloorPlanRepository floorPlanRepository;
    private final ProjectRepository projectRepository;
    private final PlanAnalysisEngine analysisEngine;
    private final ObjectMapper objectMapper;

    public PlanAnalysisService(PlanAnalysisRepository planAnalysisRepository,
                               FloorPlanRepository floorPlanRepository,
                               ProjectRepository projectRepository,
                               PlanAnalysisEngine analysisEngine,
                               ObjectMapper objectMapper) {
        this.planAnalysisRepository = planAnalysisRepository;
        this.floorPlanRepository = floorPlanRepository;
        this.projectRepository = projectRepository;
        this.analysisEngine = analysisEngine;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public PlanAnalysisResponse analyzePlan(Long floorPlanId) {
        return analyzePlan(floorPlanId, null);
    }

    @Transactional
    public PlanAnalysisResponse analyzePlan(Long floorPlanId, String userApiKey) {
        FloorPlan floorPlan = floorPlanRepository.findById(floorPlanId)
                .orElseThrow(() -> ResourceNotFoundException.notFound("FloorPlan", floorPlanId));

        PlanAnalysisEngine.AnalysisExtractionResult extraction = analysisEngine.extract(floorPlan, userApiKey);

        PlanAnalysis analysis = planAnalysisRepository.findByFloorPlanId(floorPlanId)
                .orElse(new PlanAnalysis());

        analysis.setFloorPlanId(floorPlanId);
        analysis.setProjectId(floorPlan.getProjectId());
        analysis.setStatus(PlanAnalysisStatus.ANALYZED);
        analysis.setRoomsJson(toJson(extraction.rooms()));
        analysis.setOpeningsJson(toJson(extraction.openings()));
        analysis.setStairsJson(toJson(extraction.stairs()));
        analysis.setTotalCalculatedAreaSqFt(BigDecimal.valueOf(extraction.totalAreaSqFt()));
        analysis.setConfidenceScore(extraction.confidenceScore());
        analysis.setConfirmedAt(null);

        PlanAnalysis saved = planAnalysisRepository.save(analysis);

        floorPlan.setStatus(FloorPlanStatus.ANALYZED);
        floorPlanRepository.save(floorPlan);

        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public PlanAnalysisResponse getAnalysis(Long floorPlanId) {
        PlanAnalysis analysis = planAnalysisRepository.findByFloorPlanId(floorPlanId)
                .orElseThrow(() -> ResourceNotFoundException.notFound("PlanAnalysis for FloorPlan", floorPlanId));
        return toResponse(analysis);
    }

    @Transactional
    public PlanAnalysisResponse updateAnalysis(Long floorPlanId, AnalysisUpdateRequest request) {
        PlanAnalysis analysis = planAnalysisRepository.findByFloorPlanId(floorPlanId)
                .orElseThrow(() -> ResourceNotFoundException.notFound("PlanAnalysis for FloorPlan", floorPlanId));

        List<RoomDto> rooms = request.rooms() != null ? request.rooms() : Collections.emptyList();
        List<OpeningDto> openings = request.openings() != null ? request.openings() : Collections.emptyList();
        List<StairDto> stairs = request.stairs() != null ? request.stairs() : Collections.emptyList();

        double totalArea = rooms.stream()
                .mapToDouble(r -> r.areaSqFt() != null ? r.areaSqFt() : (r.lengthFt() * r.widthFt()))
                .sum();

        analysis.setRoomsJson(toJson(rooms));
        analysis.setOpeningsJson(toJson(openings));
        analysis.setStairsJson(toJson(stairs));
        analysis.setTotalCalculatedAreaSqFt(BigDecimal.valueOf(totalArea));

        PlanAnalysis saved = planAnalysisRepository.save(analysis);
        return toResponse(saved);
    }

    @Transactional
    public PlanAnalysisResponse confirmAnalysis(Long floorPlanId) {
        PlanAnalysis analysis = planAnalysisRepository.findByFloorPlanId(floorPlanId)
                .orElseThrow(() -> ResourceNotFoundException.notFound("PlanAnalysis for FloorPlan", floorPlanId));

        FloorPlan floorPlan = floorPlanRepository.findById(floorPlanId)
                .orElseThrow(() -> ResourceNotFoundException.notFound("FloorPlan", floorPlanId));

        analysis.setStatus(PlanAnalysisStatus.CONFIRMED);
        analysis.setConfirmedAt(Instant.now());
        PlanAnalysis saved = planAnalysisRepository.save(analysis);

        floorPlan.setStatus(FloorPlanStatus.CONFIRMED);
        floorPlanRepository.save(floorPlan);

        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public PlanAnalysisResponse getConfirmedAnalysis(Long floorPlanId) {
        PlanAnalysis analysis = planAnalysisRepository.findByFloorPlanId(floorPlanId)
                .orElseThrow(() -> ResourceNotFoundException.notFound("PlanAnalysis for FloorPlan", floorPlanId));

        if (analysis.getStatus() != PlanAnalysisStatus.CONFIRMED) {
            throw new IllegalStateException("Plan analysis for floor plan " + floorPlanId + " has not been confirmed yet.");
        }
        return toResponse(analysis);
    }

    @Transactional(readOnly = true)
    public ProjectConfirmedPlansResponse getProjectConfirmedPlans(Long projectId) {
        if (!projectRepository.existsById(projectId)) {
            throw ResourceNotFoundException.notFound("Project", projectId);
        }

        List<FloorPlan> plans = floorPlanRepository.findByProjectIdOrderByFloorNumberAsc(projectId);
        List<ConfirmedFloorDto> confirmedFloors = new ArrayList<>();
        double totalBuiltUpArea = 0.0;

        for (FloorPlan plan : plans) {
            if (plan.getStatus() == FloorPlanStatus.CONFIRMED) {
                var analysisOpt = planAnalysisRepository.findByFloorPlanId(plan.getId());
                if (analysisOpt.isPresent()) {
                    PlanAnalysis analysis = analysisOpt.get();
                    List<RoomDto> rooms = parseRooms(analysis.getRoomsJson());
                    List<OpeningDto> openings = parseOpenings(analysis.getOpeningsJson());
                    List<StairDto> stairs = parseStairs(analysis.getStairsJson());

                    double floorArea = rooms.stream().mapToDouble(RoomDto::areaSqFt).sum();
                    totalBuiltUpArea += floorArea;

                    confirmedFloors.add(new ConfirmedFloorDto(
                            plan.getId(),
                            plan.getFloorNumber(),
                            plan.getFloorName(),
                            plan.getPlanType(),
                            plan.getStatus().name(),
                            analysis.getConfirmedAt(),
                            rooms,
                            openings,
                            stairs
                    ));
                }
            }
        }

        return new ProjectConfirmedPlansResponse(
                projectId,
                confirmedFloors.size(),
                totalBuiltUpArea,
                confirmedFloors
        );
    }

    private PlanAnalysisResponse toResponse(PlanAnalysis analysis) {
        return new PlanAnalysisResponse(
                analysis.getId(),
                analysis.getFloorPlanId(),
                analysis.getProjectId(),
                analysis.getStatus(),
                parseRooms(analysis.getRoomsJson()),
                parseOpenings(analysis.getOpeningsJson()),
                parseStairs(analysis.getStairsJson()),
                analysis.getTotalCalculatedAreaSqFt() != null ? analysis.getTotalCalculatedAreaSqFt().doubleValue() : 0.0,
                analysis.getConfidenceScore(),
                analysis.getConfirmedAt(),
                analysis.getCreatedAt(),
                analysis.getUpdatedAt()
        );
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("JSON serialization error", e);
        }
    }

    private List<RoomDto> parseRooms(String json) {
        if (json == null || json.isBlank()) return Collections.emptyList();
        try {
            return objectMapper.readValue(json, new TypeReference<List<RoomDto>>() {});
        } catch (JsonProcessingException e) {
            return Collections.emptyList();
        }
    }

    private List<OpeningDto> parseOpenings(String json) {
        if (json == null || json.isBlank()) return Collections.emptyList();
        try {
            return objectMapper.readValue(json, new TypeReference<List<OpeningDto>>() {});
        } catch (JsonProcessingException e) {
            return Collections.emptyList();
        }
    }

    private List<StairDto> parseStairs(String json) {
        if (json == null || json.isBlank()) return Collections.emptyList();
        try {
            return objectMapper.readValue(json, new TypeReference<List<StairDto>>() {});
        } catch (JsonProcessingException e) {
            return Collections.emptyList();
        }
    }
}
