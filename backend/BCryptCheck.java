import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class BCryptCheck {
    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        System.out.println(encoder.matches("operator123", "$2a$12$Mj4iIHDB8TFj1kb..bqXqe.XuM81gD/nVP81yIVZK8OldBhlA2BES"));
    }
}
