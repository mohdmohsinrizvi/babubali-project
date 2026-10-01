package com.smartbuild.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.smartbuild.dto.FloorPlanResponse;
import com.smartbuild.exception.ResourceNotFoundException;
import com.smartbuild.model.FloorPlan;
import com.smartbuild.model.FloorPlanStatus;
import com.smartbuild.repository.FloorPlanRepository;
import com.smartbuild.repository.ProjectRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

@ExtendWith(MockitoExtension.class)
class FloorPlanServiceTest {

    @Mock
    private FloorPlanRepository floorPlanRepository;

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private FileStorageService fileStorageService;

    private FloorPlanService floorPlanService;

    @BeforeEach
    void setUp() {
        floorPlanService = new FloorPlanService(floorPlanRepository, projectRepository, fileStorageService);
    }

    @Test
    void uploadPlan_projectNotFound_throwsException() {
        when(projectRepository.existsById(99L)).thenReturn(false);
        MockMultipartFile file = new MockMultipartFile("file", "plan.pdf", "application/pdf", new byte[]{1, 2, 3});

        assertThatThrownBy(() -> floorPlanService.uploadPlan(99L, 0, "Ground Floor", "ARCHITECTURAL", file))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void uploadPlan_validFile_success() {
        Long projectId = 1L;
        MockMultipartFile file = new MockMultipartFile("file", "ground.png", "image/png", "dummy".getBytes());

        when(projectRepository.existsById(projectId)).thenReturn(true);
        when(fileStorageService.storeFile(projectId, file)).thenReturn("projects/1/uuid-ground.png");
        when(floorPlanRepository.findByProjectIdAndFloorNumber(projectId, 0)).thenReturn(Optional.empty());

        FloorPlan saved = new FloorPlan();
        saved.setId(10L);
        saved.setProjectId(projectId);
        saved.setFloorNumber(0);
        saved.setFloorName("Ground Floor");
        saved.setPlanType("ARCHITECTURAL");
        saved.setFileName("ground.png");
        saved.setFileType("image/png");
        saved.setFileSize(5L);
        saved.setStorageReference("projects/1/uuid-ground.png");
        saved.setStatus(FloorPlanStatus.UPLOADED);

        when(floorPlanRepository.save(any(FloorPlan.class))).thenReturn(saved);

        FloorPlanResponse response = floorPlanService.uploadPlan(projectId, 0, "Ground Floor", "ARCHITECTURAL", file);

        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(10L);
        assertThat(response.floorNumber()).isEqualTo(0);
        assertThat(response.fileName()).isEqualTo("ground.png");
        assertThat(response.status()).isEqualTo(FloorPlanStatus.UPLOADED);
    }

    @Test
    void getPlansByProject_returnsOrderedList() {
        Long projectId = 1L;
        FloorPlan plan = new FloorPlan();
        plan.setId(5L);
        plan.setProjectId(projectId);
        plan.setFloorNumber(0);
        plan.setFloorName("Ground");
        plan.setPlanType("ARCHITECTURAL");
        plan.setFileName("test.pdf");
        plan.setFileType("application/pdf");
        plan.setFileSize(100L);
        plan.setStatus(FloorPlanStatus.UPLOADED);

        when(projectRepository.existsById(projectId)).thenReturn(true);
        when(floorPlanRepository.findByProjectIdOrderByFloorNumberAsc(projectId)).thenReturn(List.of(plan));

        List<FloorPlanResponse> plans = floorPlanService.getPlansByProject(projectId);
        assertThat(plans).hasSize(1);
        assertThat(plans.get(0).id()).isEqualTo(5L);
    }

    @Test
    void deletePlan_deletesFileAndEntity() {
        Long planId = 12L;
        FloorPlan plan = new FloorPlan();
        plan.setId(planId);
        plan.setStorageReference("projects/1/sample.pdf");

        when(floorPlanRepository.findById(planId)).thenReturn(Optional.of(plan));

        floorPlanService.deletePlan(planId);

        verify(fileStorageService).deleteFile("projects/1/sample.pdf");
        verify(floorPlanRepository).delete(plan);
    }
}
