require 'minitest'

def run_spec_test(test_case, options = {})
  if options[:skip_todo] && test_case.todo?
    skip "Skipped todo"
  end

  if options[:sass_version] && !test_case.applies_to_version?(options[:sass_version])
    skip "Test doesn't apply to #{options[:sass_version]}"
  end

  assert test_case.input_path.readable?, "Input #{test_case.input_path} file does not exist"
  assert test_case.expected_path.readable?, "Expected #{test_case.expected_path} file does not exist"

  output, error, status = test_case.output

  if status != 0
    msg = "Command `#{options[:sass_executable]}` did not complete:\n\n#{error}"

    if options[:skip]
      raise msg
    end

    puts msg
    exit 4
  end

  assert_equal test_case.expected, output, "Expected did not match output"
end


# Holder to put and run test cases
class SassSpec::Test < Minitest::Test
  parallelize_me!
  def self.create_tests(test_cases, options = {})
    test_cases.each do |test_case|
      define_method('test__' << test_case.name) do
        run_spec_test(test_case, options)
      end
    end
  end
end
