<?php

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

class PHP_Email_Form {
    public $to = '';
    public $from_name = '';
    public $from_email = '';
    public $subject = '';
    public $smtp = array();
    public $messages = array();
    public $ajax = false;

    public function add_message($content, $label, $priority = 10) {
        $this->messages[] = array(
            'content' => $content,
            'label' => $label,
            'priority' => $priority
        );
    }

    public function send() {
        $mail_body = $this->build_message();
        
        if (!empty($this->smtp)) {
            return $this->send_with_smtp($mail_body);
        } else {
            return $this->send_with_mail($mail_body);
        }
    }

    private function build_message() {
        $mail_content = '';
        foreach ($this->messages as $message) {
            $mail_content .= $message['label'] . ": " . $message['content'] . "\n";
        }
        return $mail_content;
    }

    private function send_with_mail($mail_body) {
        $headers = "From: " . $this->from_name . " <" . $this->from_email . ">\r\n";
        if (mail($this->to, $this->subject, $mail_body, $headers)) {
            return 'OK';
        } else {
            return 'Failed to send email!';
        }
    }

    private function send_with_smtp($mail_body) {
        $mail = new PHPMailer(true);

        try {
            //Server settings
            $mail->isSMTP();
            $mail->Host = $this->smtp['host'];
            $mail->SMTPAuth = true;
            $mail->Username = $this->smtp['username'];
            $mail->Password = $this->smtp['password'];
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port = $this->smtp['port'];

            //Recipients
            $mail->setFrom($this->from_email, $this->from_name);
            $mail->addAddress($this->to);

            // Content
            $mail->isHTML(false);  // Set email format to plain text
            $mail->Subject = $this->subject;
            $mail->Body    = $mail_body;

            $mail->send();
            return 'OK';
        } catch (Exception $e) {
            return "Message could not be sent. Mailer Error: {$mail->ErrorInfo}";
        }
    }
}

?>
