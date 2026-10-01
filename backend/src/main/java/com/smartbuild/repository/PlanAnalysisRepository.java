package com.smartbuild.repository;

import com.smartbuild.model.PlanAnalysis;
import com.smartbuild.model.PlanAnalysisStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlanAnalysisRepository extends JpaRepository<PlanAnalysis, Long> {
    Optional<PlanAnalysis> findByFloorPlanId(Long floorPlanId);
    List<PlanAnalysis> findByProjectId(Long projectId);
    List<PlanAnalysis> findByProjectIdAndStatus(Long projectId, PlanAnalysisStatus status);
    void deleteByFloorPlanId(Long floorPlanId);
    void deleteByProjectId(Long projectId);
}
