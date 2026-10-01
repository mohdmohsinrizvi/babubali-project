package com.smartbuild.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "plan_analyses")
public class PlanAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "floor_plan_id", nullable = false, unique = true)
    private Long floorPlanId;

    @Column(name = "project_id", nullable = false)
    private Long projectId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private PlanAnalysisStatus status = PlanAnalysisStatus.PENDING;

    @Column(name = "rooms_json", columnDefinition = "TEXT")
    private String roomsJson;

    @Column(name = "openings_json", columnDefinition = "TEXT")
    private String openingsJson;

    @Column(name = "stairs_json", columnDefinition = "TEXT")
    private String stairsJson;

    @Column(name = "total_calculated_area_sq_ft", precision = 12, scale = 2)
    private BigDecimal totalCalculatedAreaSqFt;

    @Column(name = "confidence_score")
    private Double confidenceScore;

    @Column(name = "confirmed_at")
    private Instant confirmedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public PlanAnalysis() {
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getFloorPlanId() {
        return floorPlanId;
    }

    public void setFloorPlanId(Long floorPlanId) {
        this.floorPlanId = floorPlanId;
    }

    public Long getProjectId() {
        return projectId;
    }

    public void setProjectId(Long projectId) {
        this.projectId = projectId;
    }

    public PlanAnalysisStatus getStatus() {
        return status;
    }

    public void setStatus(PlanAnalysisStatus status) {
        this.status = status;
    }

    public String getRoomsJson() {
        return roomsJson;
    }

    public void setRoomsJson(String roomsJson) {
        this.roomsJson = roomsJson;
    }

    public String getOpeningsJson() {
        return openingsJson;
    }

    public void setOpeningsJson(String openingsJson) {
        this.openingsJson = openingsJson;
    }

    public String getStairsJson() {
        return stairsJson;
    }

    public void setStairsJson(String stairsJson) {
        this.stairsJson = stairsJson;
    }

    public BigDecimal getTotalCalculatedAreaSqFt() {
        return totalCalculatedAreaSqFt;
    }

    public void setTotalCalculatedAreaSqFt(BigDecimal totalCalculatedAreaSqFt) {
        this.totalCalculatedAreaSqFt = totalCalculatedAreaSqFt;
    }

    public Double getConfidenceScore() {
        return confidenceScore;
    }

    public void setConfidenceScore(Double confidenceScore) {
        this.confidenceScore = confidenceScore;
    }

    public Instant getConfirmedAt() {
        return confirmedAt;
    }

    public void setConfirmedAt(Instant confirmedAt) {
        this.confirmedAt = confirmedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
