package com.smartbuild.controller;

import com.smartbuild.dto.FloorPlanResponse;
import com.smartbuild.model.FloorPlan;
import com.smartbuild.service.FloorPlanService;
import java.io.IOException;
import java.nio.file.Files;
import java.util.List;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api")
public class FloorPlanController {

    private final FloorPlanService floorPlanService;

    public FloorPlanController(FloorPlanService floorPlanService) {
        this.floorPlanService = floorPlanService;
    }

    @PostMapping(value = "/projects/{projectId}/plans", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<FloorPlanResponse> uploadPlan(
            @PathVariable Long projectId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "floorNumber", required = false, defaultValue = "0") Integer floorNumber,
            @RequestParam(value = "floorName", required = false) String floorName,
            @RequestParam(value = "planType", required = false, defaultValue = "ARCHITECTURAL") String planType
    ) {
        FloorPlanResponse response = floorPlanService.uploadPlan(projectId, floorNumber, floorName, planType, file);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/projects/{projectId}/plans")
    public List<FloorPlanResponse> getPlansByProject(@PathVariable Long projectId) {
        return floorPlanService.getPlansByProject(projectId);
    }

    @GetMapping("/plans/{planId}")
    public FloorPlanResponse getPlan(@PathVariable Long planId) {
        return floorPlanService.getPlan(planId);
    }

    @GetMapping("/plans/{planId}/file")
    public ResponseEntity<Resource> getPlanFile(@PathVariable Long planId) {
        FloorPlan plan = floorPlanService.getPlanEntity(planId);
        Resource resource = floorPlanService.loadPlanFile(planId);

        String contentType = plan.getFileType();
        if (contentType == null || contentType.isBlank()) {
            try {
                contentType = Files.probeContentType(resource.getFile().toPath());
            } catch (IOException ignored) {
                contentType = "application/octet-stream";
            }
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + plan.getFileName() + "\"")
                .body(resource);
    }

    @DeleteMapping("/plans/{planId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePlan(@PathVariable Long planId) {
        floorPlanService.deletePlan(planId);
    }
}
