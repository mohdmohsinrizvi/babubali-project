package com.smartbuild.service;

import com.smartbuild.dto.FloorPlanResponse;
import com.smartbuild.exception.ResourceNotFoundException;
import com.smartbuild.model.FloorPlan;
import com.smartbuild.model.FloorPlanStatus;
import com.smartbuild.repository.FloorPlanRepository;
import com.smartbuild.repository.ProjectRepository;
import java.util.List;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class FloorPlanService {

    private final FloorPlanRepository floorPlanRepository;
    private final ProjectRepository projectRepository;
    private final FileStorageService fileStorageService;

    public FloorPlanService(FloorPlanRepository floorPlanRepository,
                            ProjectRepository projectRepository,
                            FileStorageService fileStorageService) {
        this.floorPlanRepository = floorPlanRepository;
        this.projectRepository = projectRepository;
        this.fileStorageService = fileStorageService;
    }

    @Transactional
    public FloorPlanResponse uploadPlan(Long projectId,
                                        Integer floorNumber,
                                        String floorName,
                                        String planType,
                                        MultipartFile file) {
        // 1. Verify project exists
        if (!projectRepository.existsById(projectId)) {
            throw ResourceNotFoundException.notFound("Project", projectId);
        }

        if (floorNumber == null) {
            floorNumber = 0;
        }
        if (floorName == null || floorName.isBlank()) {
            floorName = floorNumber == 0 ? "Ground Floor" : "Floor " + floorNumber;
        }
        if (planType == null || planType.isBlank()) {
            planType = "ARCHITECTURAL";
        }

        // 2. Store file on disk
        String storageReference = fileStorageService.storeFile(projectId, file);

        // 3. Check if floor plan already exists for this floorNumber
        FloorPlan plan = floorPlanRepository.findByProjectIdAndFloorNumber(projectId, floorNumber)
                .orElse(new FloorPlan());

        // If replacing an existing file, clean up the old file
        if (plan.getId() != null && plan.getStorageReference() != null && !plan.getStorageReference().equals(storageReference)) {
            fileStorageService.deleteFile(plan.getStorageReference());
        }

        plan.setProjectId(projectId);
        plan.setFloorNumber(floorNumber);
        plan.setFloorName(floorName);
        plan.setPlanType(planType);
        plan.setFileName(file.getOriginalFilename());
        plan.setFileType(file.getContentType());
        plan.setFileSize(file.getSize());
        plan.setStorageReference(storageReference);
        plan.setStatus(FloorPlanStatus.UPLOADED);

        FloorPlan saved = floorPlanRepository.save(plan);
        return FloorPlanResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<FloorPlanResponse> getPlansByProject(Long projectId) {
        if (!projectRepository.existsById(projectId)) {
            throw ResourceNotFoundException.notFound("Project", projectId);
        }
        return floorPlanRepository.findByProjectIdOrderByFloorNumberAsc(projectId)
                .stream()
                .map(FloorPlanResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public FloorPlan getPlanEntity(Long planId) {
        return floorPlanRepository.findById(planId)
                .orElseThrow(() -> ResourceNotFoundException.notFound("FloorPlan", planId));
    }

    @Transactional(readOnly = true)
    public FloorPlanResponse getPlan(Long planId) {
        return FloorPlanResponse.from(getPlanEntity(planId));
    }

    @Transactional(readOnly = true)
    public Resource loadPlanFile(Long planId) {
        FloorPlan plan = getPlanEntity(planId);
        return fileStorageService.loadFileAsResource(plan.getStorageReference());
    }

    @Transactional
    public void deletePlan(Long planId) {
        FloorPlan plan = getPlanEntity(planId);
        fileStorageService.deleteFile(plan.getStorageReference());
        floorPlanRepository.delete(plan);
    }
}
