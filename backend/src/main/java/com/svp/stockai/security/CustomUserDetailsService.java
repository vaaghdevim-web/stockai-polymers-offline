package com.svp.stockai.security;

import com.svp.stockai.entity.AppUser;
import com.svp.stockai.entity.UserRole;
import com.svp.stockai.repository.AppUserRepository;
import com.svp.stockai.repository.UserRoleRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final AppUserRepository appUserRepository;
    private final UserRoleRepository userRoleRepository;

    @Transactional(readOnly = true)
    public AppUser loadActiveUser(String usernameOrEmail) {

        AppUser user = appUserRepository.findByUserName(usernameOrEmail)
                .or(() -> appUserRepository.findByEmail(usernameOrEmail))
                .orElseThrow(() ->
                        new UsernameNotFoundException("User not found"));

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new UsernameNotFoundException("User is inactive");
        }

        return user;
    }

    @Transactional(readOnly = true)
    public List<GrantedAuthority> loadAuthorities(AppUser user) {

        List<UserRole> userRoles =
                userRoleRepository.findByUserAndIsActiveTrue(user);

        return userRoles.stream()
                .filter(userRole ->
                        Boolean.TRUE.equals(
                                userRole.getRole().getIsActive()
                        ))
                .map(userRole ->
                        new SimpleGrantedAuthority(
                                "ROLE_" +
                                userRole.getRole().getRoleName()
                        ))
                .map(authority -> (GrantedAuthority) authority)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String usernameOrEmail)
            throws UsernameNotFoundException {

        AppUser user = loadActiveUser(usernameOrEmail);

        List<GrantedAuthority> authorities =
                loadAuthorities(user);

        String passwordHash = user.getPasswordHash();

        if (passwordHash == null) {
            passwordHash = "";
        }

        return new User(
                user.getUserName(),
                passwordHash,
                Boolean.TRUE.equals(user.getIsActive()),
                true,
                true,
                true,
                authorities
        );
    }
}