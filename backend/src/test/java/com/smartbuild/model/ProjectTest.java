package com.smartbuild.model;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class ProjectTest {

    private Project sample() {
        Project project = new Project();
        project.setName("Greenfield Villa");
        project.setState("Karnataka");
        project.setDistrict("Bengaluru Urban");
        project.setCity("Bengaluru");
        project.setConstructionType("Residential");
        project.setLandAreaSqFt(new BigDecimal("2400.00"));
        project.setBuiltUpAreaSqFt(new BigDecimal("1800.50"));
        project.setFloorCount(2);
        return project;
    }

    @Test
    void statusDefaultsToDraft() {
        assertThat(sample().getStatus()).isEqualTo(ProjectStatus.DRAFT);
    }

    @Test
    void prePersistSetsBothTimestamps() {
        Project project = sample();
        assertThat(project.getCreatedAt()).isNull();
        assertThat(project.getUpdatedAt()).isNull();

        Instant before = Instant.now();
        project.onCreate();
        Instant after = Instant.now();

        assertThat(project.getCreatedAt()).isBetween(before, after);
        assertThat(project.getUpdatedAt()).isEqualTo(project.getCreatedAt());
    }

    @Test
    void preUpdateTouchesUpdatedAtOnly() {
        Project project = sample();
        project.onCreate();
        Instant createdAt = project.getCreatedAt();

        Thread.yield();
        project.onUpdate();

        assertThat(project.getUpdatedAt()).isAfterOrEqualTo(createdAt);
        assertThat(project.getCreatedAt()).isEqualTo(createdAt);
    }

    @Test
    void timestampsAreDrivenByJpaLifecycleCallbacks() throws Exception {
        var column = Project.class.getDeclaredField("createdAt")
                .getAnnotation(jakarta.persistence.Column.class);
        assertThat(column.updatable()).isFalse();
        assertThat(column.nullable()).isFalse();

        var updatedAtColumn = Project.class.getDeclaredField("updatedAt")
                .getAnnotation(jakarta.persistence.Column.class);
        assertThat(updatedAtColumn.nullable()).isFalse();

        assertThat(Project.class.getDeclaredMethod("onCreate")
                .getAnnotation(jakarta.persistence.PrePersist.class)).isNotNull();
        assertThat(Project.class.getDeclaredMethod("onUpdate")
                .getAnnotation(jakarta.persistence.PreUpdate.class)).isNotNull();
    }
}
