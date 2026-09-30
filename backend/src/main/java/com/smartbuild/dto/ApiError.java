package com.smartbuild.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import java.util.Map;

public record ApiError(
        Instant timestamp,
        int status,
        String error,
        String message,
        @JsonInclude(JsonInclude.Include.NON_NULL) Map<String, String> fieldErrors
) {

    public ApiError {
    }

    public static ApiError of(int status, String error, String message) {
        return new ApiError(Instant.now(), status, error, message, null);
    }

    public static ApiError withFieldErrors(int status, String message, Map<String, String> fieldErrors) {
        return new ApiError(Instant.now(), status, "VALIDATION_ERROR", message, fieldErrors);
    }
}
