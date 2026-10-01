package com.smartbuild.controller;

import com.smartbuild.dto.AnalysisUpdateRequest;
import com.smartbuild.dto.PlanAnalysisResponse;
import com.smartbuild.dto.ProjectConfirmedPlansResponse;
import com.smartbuild.service.PlanAnalysisService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class PlanAnalysisController {

    private final PlanAnalysisService planAnalysisService;

    public PlanAnalysisController(PlanAnalysisService planAnalysisService) {
        this.planAnalysisService = planAnalysisService;
    }

    @PostMapping("/plans/{planId}/analyze")
    public ResponseEntity<PlanAnalysisResponse> analyzePlan(
            @PathVariable Long planId,
            @org.springframework.web.bind.annotation.RequestHeader(value = "X-Gemini-Api-Key", required = false) String headerApiKey,
            @org.springframework.web.bind.annotation.RequestParam(value = "apiKey", required = false) String paramApiKey
    ) {
        String key = (paramApiKey != null && !paramApiKey.isBlank()) ? paramApiKey : headerApiKey;
        PlanAnalysisResponse response = planAnalysisService.analyzePlan(planId, key);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/plans/{planId}/analysis")
    public ResponseEntity<PlanAnalysisResponse> getAnalysis(@PathVariable Long planId) {
        PlanAnalysisResponse response = planAnalysisService.getAnalysis(planId);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/plans/{planId}/analysis")
    public ResponseEntity<PlanAnalysisResponse> updateAnalysis(
            @PathVariable Long planId,
            @RequestBody AnalysisUpdateRequest request
    ) {
        PlanAnalysisResponse response = planAnalysisService.updateAnalysis(planId, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/plans/{planId}/confirm")
    public ResponseEntity<PlanAnalysisResponse> confirmAnalysis(@PathVariable Long planId) {
        PlanAnalysisResponse response = planAnalysisService.confirmAnalysis(planId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/plans/{planId}/confirmed-analysis")
    public ResponseEntity<PlanAnalysisResponse> getConfirmedAnalysis(@PathVariable Long planId) {
        PlanAnalysisResponse response = planAnalysisService.getConfirmedAnalysis(planId);
        return ResponseEntity.ok(response);
    }

    /**
     * Master endpoint consumed by Member 3 (Estimation) & Member 4 (3D & Reports).
     * Returns all confirmed floor plans and verified room/opening layouts for the project.
     */
    @GetMapping("/projects/{projectId}/confirmed-plans")
    public ResponseEntity<ProjectConfirmedPlansResponse> getProjectConfirmedPlans(@PathVariable Long projectId) {
        ProjectConfirmedPlansResponse response = planAnalysisService.getProjectConfirmedPlans(projectId);
        return ResponseEntity.ok(response);
    }
}
