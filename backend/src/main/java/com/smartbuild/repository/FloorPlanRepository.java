package com.smartbuild.repository;

import com.smartbuild.model.FloorPlan;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FloorPlanRepository extends JpaRepository<FloorPlan, Long> {
    List<FloorPlan> findByProjectIdOrderByFloorNumberAsc(Long projectId);
    Optional<FloorPlan> findByIdAndProjectId(Long id, Long projectId);
    Optional<FloorPlan> findByProjectIdAndFloorNumber(Long projectId, Integer floorNumber);
    void deleteByProjectId(Long projectId);
}
