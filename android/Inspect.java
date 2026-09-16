import java.lang.reflect.Method;
public class Inspect {
    public static void main(String[] args) throws Exception {
        System.out.println("Methods in com.google.androidbrowserhelper.trusted.TwaLauncher:");
        for(Method m : Class.forName("com.google.androidbrowserhelper.trusted.TwaLauncher").getMethods()) {
            System.out.println(m.getName());
        }
    }
}
