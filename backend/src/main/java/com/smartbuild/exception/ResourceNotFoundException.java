package com.smartbuild.exception;

public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }

    public static ResourceNotFoundException notFound(String resource, Object id) {
        return new ResourceNotFoundException(resource + " not found with id " + id);
    }
}
