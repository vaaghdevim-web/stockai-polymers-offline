package com.svp.stockai.auth;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginResponse {

    private String token;
    private String refreshToken;
    private String tokenType;
    private Long userId;
    private String userName;
    private String email;
    private List<String> roles;

    public LoginResponse(String token, String tokenType, Long userId, String userName, String email, List<String> roles) {
        this.token = token;
        this.refreshToken = null;
        this.tokenType = tokenType;
        this.userId = userId;
        this.userName = userName;
        this.email = email;
        this.roles = roles;
    }
}